from pathlib import Path

import boto3

MODE = "upload"  # change to "download"
BUCKET = "dsih-artpark-cif-digitisation"
REGION = "ap-south-1"
LOCAL_FILE = "launch.sh"
S3_KEY = "uploads/launch.sh"
OUTPUT_FILE = r"C:\path\to\downloaded-file.jpg"
SSE = "AES256"
SCRIPT_DIR = Path(__file__).resolve().parent

s3 = boto3.client("s3", region_name=REGION)

if MODE == "upload":
    source = Path(LOCAL_FILE)
    if not source.is_absolute():
        source = SCRIPT_DIR / source
    if not source.is_file():
        raise FileNotFoundError(f"Upload file not found: {source}")
    s3.upload_file(str(source), BUCKET, S3_KEY, ExtraArgs={"ServerSideEncryption": SSE})
    print("uploaded")
else:
    target = Path(OUTPUT_FILE)
    if not target.is_absolute():
        target = SCRIPT_DIR / target
    target.parent.mkdir(parents=True, exist_ok=True)
    s3.download_file(BUCKET, S3_KEY, str(target))
    print("downloaded")
