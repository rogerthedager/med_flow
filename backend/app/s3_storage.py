import os
import re
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool


ALLOWED_REPORT_TYPES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".txt": {"text/plain", "application/octet-stream"},
    ".png": {"image/png", "application/octet-stream"},
    ".jpg": {"image/jpeg", "application/octet-stream"},
    ".jpeg": {"image/jpeg", "application/octet-stream"},
}
MAX_REPORT_BYTES = 10 * 1024 * 1024


def _settings() -> tuple[str, str]:
    bucket = os.environ.get("MEDFLOW_S3_BUCKET", "").strip()
    region = os.environ.get("AWS_DEFAULT_REGION", "us-east-2").strip()
    if not bucket:
        raise HTTPException(
            status_code=503,
            detail="Service report storage is not configured.",
        )
    return bucket, region


def _client(region: str):
    return boto3.client("s3", region_name=region)


def _safe_filename(filename: str | None) -> tuple[str, str]:
    original = Path(filename or "report").name
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_REPORT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PDF, TXT, PNG, JPG, and JPEG reports are supported.",
        )
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(original).stem).strip("-._")
    return (stem or "report") + extension, extension


async def upload_service_report(file: UploadFile, order_id: int) -> str:
    bucket, region = _settings()
    filename, extension = _safe_filename(file.filename)
    content_type = (file.content_type or "application/octet-stream").lower()
    if content_type not in ALLOWED_REPORT_TYPES[extension]:
        raise HTTPException(
            status_code=415,
            detail="The file extension and content type do not match.",
        )

    contents = await file.read(MAX_REPORT_BYTES + 1)
    await file.close()
    if not contents:
        raise HTTPException(status_code=400, detail="The report file is empty.")
    if len(contents) > MAX_REPORT_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Service reports must be 10 MB or smaller.",
        )

    key = f"service-reports/{order_id}/{uuid4().hex}-{filename}"
    client = _client(region)
    try:
        await run_in_threadpool(
            client.upload_fileobj,
            BytesIO(contents),
            bucket,
            key,
            {"ContentType": content_type},
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(
            status_code=502,
            detail="The report could not be uploaded to S3.",
        ) from exc
    return f"s3://{bucket}/{key}"


def split_s3_uri(file_url: str) -> tuple[str, str] | None:
    parsed = urlparse(file_url)
    if parsed.scheme != "s3" or not parsed.netloc or not parsed.path.lstrip("/"):
        return None
    return parsed.netloc, parsed.path.lstrip("/")


def create_download_url(file_url: str) -> str | None:
    location = split_s3_uri(file_url)
    if location is None:
        return None
    bucket, key = location
    _, region = _settings()
    try:
        return _client(region).generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=900,
        )
    except (BotoCoreError, ClientError):
        return None


async def delete_service_report_object(file_url: str) -> None:
    location = split_s3_uri(file_url)
    if location is None:
        return
    bucket, key = location
    _, region = _settings()
    try:
        await run_in_threadpool(
            _client(region).delete_object,
            Bucket=bucket,
            Key=key,
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(
            status_code=502,
            detail="The report could not be deleted from S3.",
        ) from exc
