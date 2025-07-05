# backend/app.py

from flask import Flask
from dotenv import load_dotenv
from flask_cors import CORS # Import CORS
import os

def create_app():
    app = Flask(__name__)
    load_dotenv() # Load environment variables from .env file

    # Load configuration from config.py
    app.config.from_object('config.DevelopmentConfig')

    # Initialize CORS
    # For development, allow all origins. In production, restrict this.
    CORS(app)

    # Register Blueprints
    from blueprints.upload import upload_bp
    from blueprints.improve import improve_bp
    from blueprints.export import export_bp

    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(improve_bp, url_prefix='/api/improve')
    app.register_blueprint(export_bp, url_prefix='/api/export')

    # Basic route for health check
    @app.route('/')
    def home():
        return "Contextual Resume Improver Backend is running!"

    return app

app = create_app()

if __name__ == '__main__':
    # app = create_app()
    app.run(debug=True, port=5000)