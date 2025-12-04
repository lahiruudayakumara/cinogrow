import logging
import sys
import os
from logging.handlers import RotatingFileHandler

# Emoji map for log levels
LEVEL_EMOJI = {
    logging.DEBUG: "🐛 DEBUG",
    logging.INFO: "ℹ️ INFO",
    logging.WARNING: "⚠️ WARNING",
    logging.ERROR: "❌ ERROR",
    logging.CRITICAL: "💥 CRITICAL"
}

class EmojiFormatter(logging.Formatter):
    def format(self, record):
        level_name = LEVEL_EMOJI.get(record.levelno, record.levelname)
        record.levelname = level_name
        return super().format(record)

def get_logger(
    name: str = __name__,
    log_file: str = "app.log",
    env_var: str = "ENVIRONMENT"
) -> logging.Logger:
    """
    Returns a logger that works only in development environment.
    Uses emojis in log levels.

    env_var: Environment variable to check (default "ENVIRONMENT")
    """
    env = os.getenv(env_var, "development").lower()
    if env != "development":
        # Return a no-op logger in non-dev environments
        return logging.getLogger(name)

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Prevent duplicate handlers
    if logger.hasHandlers():
        logger.handlers.clear()

    # Console handler with UTF-8 encoding support
    # On Windows, reconfigure stdout to use UTF-8 to handle emoji
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            # Python < 3.7 doesn't have reconfigure, wrap the stream
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_format = EmojiFormatter(
        "[%(asctime)s] %(levelname)s - %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_format)

    # File handler with rotation
    file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(console_format)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger