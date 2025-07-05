# backend/blueprints/upload.py

from flask import Blueprint, request, jsonify, current_app
from pdfminer.high_level import extract_text as extract_text_from_pdf
from docx import Document
import os
import tempfile # Still useful for safe file handling, even if not parsing with pyresparser

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/resume', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        filename = file.filename
        file_extension = filename.split('.')[-1].lower()

        text_content = ""
        # Create a temporary file to save the uploaded resume for robust extraction
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_filepath = os.path.join(temp_dir, filename)
            file.save(temp_filepath) # Save the uploaded file temporarily

            try:
                if file_extension == 'pdf':
                    with open(temp_filepath, 'rb') as f:
                        text_content = extract_text_from_pdf(f)
                elif file_extension == 'docx':
                    document = Document(temp_filepath)
                    for paragraph in document.paragraphs:
                        text_content += paragraph.text + "\n"
                else:
                    return jsonify({"error": "Unsupported file type. Please upload PDF or DOCX."}), 400

            except Exception as e:
                current_app.logger.error(f"Error extracting text from resume: {str(e)}")
                return jsonify({"error": f"Error processing resume: {str(e)}"}), 500

        # Now, instead of 'parsed_data', we return just the raw extracted text.
        return jsonify({
            "message": "Resume uploaded and text extracted successfully!",
            "filename": filename,
            "extracted_text": text_content # Raw text for Gemini to parse and improve
        }), 200
    return jsonify({"error": "Something went wrong"}), 500


@upload_bp.route('/jd', methods=['POST'])
def upload_jd():
    if 'file' not in request.files and 'text' not in request.form:
        return jsonify({"error": "No file or text provided"}), 400

    jd_content = ""
    filename = "pasted_text" # Default for pasted text

    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        filename = file.filename
        file_extension = filename.split('.')[-1].lower()

        if file_extension == 'pdf':
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_filepath = os.path.join(temp_dir, filename)
                file.save(temp_filepath)
                try:
                    with open(temp_filepath, 'rb') as f:
                        jd_content = extract_text_from_pdf(f)
                except Exception as e:
                    current_app.logger.error(f"Error parsing PDF JD: {str(e)}")
                    return jsonify({"error": f"Error parsing PDF: {str(e)}"}), 500
        elif file_extension == 'txt':
            jd_content = file.stream.read().decode('utf-8')
        else:
            return jsonify({"error": "Unsupported file type for JD. Please upload PDF or TXT."}), 400
    elif 'text' in request.form:
        jd_content = request.form['text']

    if jd_content:
        return jsonify({
            "message": "Job Description uploaded/pasted and processed successfully!",
            "content": jd_content, # Full content for Gemini
            "filename": filename
        }), 200
    return jsonify({"error": "Something went wrong"}), 500