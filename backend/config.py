# backend/config.py

import os

class Config:
    """Base configuration."""
    # SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_super_secret_key_change_this_in_production'
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/resume_improver_db'

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    # CORS will be handled by Flask-CORS extension in app.py
    # CORS_HEADERS = 'Content-Type' # This line is no longer strictly needed if using Flask-CORS with default setup

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # Example for restricted CORS in production
    # CORS_ORIGINS = ['https://your-frontend-domain.com']