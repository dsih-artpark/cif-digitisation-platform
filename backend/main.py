import os

import uvicorn


def main() -> None:
    port = int(os.getenv("API_PORT", "8787"))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        access_log=True,
    )


if __name__ == "__main__":
    main()
