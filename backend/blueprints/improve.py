# backend/blueprints/improve.py

from flask import Blueprint, request, jsonify, current_app
import google.generativeai as genai
import os
import json # For JSON parsing of Gemini output
import re

improve_bp = Blueprint('improve', __name__)

import re

def clean_gemini_output(text):
    """Clean Gemini/LLM markdown-like output for plain text extraction."""
    if not text:
        return ""

    # Remove markdown bold/italic markers
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # italic

    # Remove inline code backticks
    text = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', text)

    # Remove fenced code blocks (```json, ```python, etc.)
    text = re.sub(r'```[\w]*\n(.*?)\n```', r'\1', text, flags=re.DOTALL)

    # Remove leading/trailing markdown headers or horizontal lines
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^-{2,}|^_{2,}', '', text, flags=re.MULTILINE)

    # Remove extra spacing and newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)

    return text.strip()


@improve_bp.route('/', methods=['POST'])
@improve_bp.route('', methods=['POST'])
def improve_resume():
    data = request.get_json()
    raw_resume_text = data.get('resume_text') # This is now just raw text
    jd_text = data.get('jd_text')

    if not raw_resume_text or not jd_text:
        return jsonify({"error": "Resume and Job Description text are required"}), 400

    gemini_api_key = current_app.config.get('GEMINI_API_KEY')
    if not gemini_api_key:
        return jsonify({"error": "Gemini API Key not configured."}), 500

    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # --- NEW: Gemini for Initial Resume Parsing/Extraction ---  
        # Ask Gemini to extract key sections into a structured JSON format.
        # This replaces pyresparser.
        resume_extraction_prompt = f"""
        Extract the following information from the resume text below and format it as a JSON object.
        If a section is not found, use an empty string or empty list as appropriate.

        Resume Text:
        {raw_resume_text}

        JSON Structure:
        {{
            "summary": "...",
            "experience": [
                {{"title": "...", "company": "...", "duration": "...", "responsibilities": ["...", "..."]}},
                // more experience entries
            ],
            "education": [
                {{"degree": "...", "university": "...", "year": "..."}},
                // more education entries
            ],
            "skills": ["skill1", "skill2", "..."],
            "achievements": ["...", "..."],
            "contact_info": {{"name": "...", "email": "...", "phone": "...", "linkedin": "..."}}
        }}
        
        Ensure the output is a valid JSON string.
        """
        
        extracted_resume_response = model.generate_content(resume_extraction_prompt)
        
        # Robustly parse the JSON from Gemini's response
        try:
            # Gemini might add markdown ```json ``` block
            json_str = extracted_resume_response.text.strip()
            if json_str.startswith('```json') and json_str.endswith('```'):
                json_str = json_str[7:-3].strip()
            extracted_resume_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            current_app.logger.error(f"Failed to parse JSON from Gemini resume extraction: {e}. Raw response: {extracted_resume_response.text}")
            return jsonify({"error": "AI failed to extract structured resume data correctly. Please try a different resume or provide clearer text."}), 500

        # Now use the extracted_resume_data for tailoring
        current_summary = extracted_resume_data.get('summary', '')
        current_experience_bullets = []
        for exp in extracted_resume_data.get('experience', []):
            if 'responsibilities' in exp and isinstance(exp['responsibilities'], list):
                current_experience_bullets.extend(exp['responsibilities'])
            elif 'description' in exp: # Sometimes it might be a single description string
                current_experience_bullets.append(exp['description'])
        
        current_skills = extracted_resume_data.get('skills', [])

        # --- Prompt Templates for Gemini (now using extracted data) ---

        # 1. Summary Tailoring
        summary_prompt = f"""
        You are an expert resume writer. Rewrite the following resume summary to be highly tailored for the provided job description.
        Focus on aligning the summary with the key requirements, skills, and overall tone of the job description.
        
        Current Resume Summary:
        {current_summary}

        Job Description:
        {jd_text}

        Rewrite the summary concisely and powerfully, focusing on relevant experience and skills mentioned in the JD.
        """
        response_summary = model.generate_content(summary_prompt)
        improved_summary = clean_gemini_output(response_summary.text)

        # 2. Bullet Point Rewriting
        # We'll send the extracted bullets and ask Gemini to rewrite them
        bullets_prompt = f"""
        You are an expert resume writer. Given the following resume experience bullet points and job description,
        rewrite *each* bullet point to better highlight achievements and skills relevant to the job description.
        Use strong action verbs and quantifiable results where possible.
        Return each rewritten bullet point on a new line, starting with an asterisk (*).

        Current Resume Bullet Points:
        {'- ' + '\n- '.join(current_experience_bullets)} 

        Job Description:
        {jd_text}
        """
        response_bullets = model.generate_content(bullets_prompt)
        # Parse bullet points, assuming Gemini returns them with asterisks
        improved_bullets = [line.strip() for line in response_bullets.text.split('\n') if line.strip().startswith('*')]
        if not improved_bullets: # Fallback if Gemini doesn't use asterisks for some reason
            improved_bullets = [line.strip() for line in response_bullets.text.split('\n') if line.strip()]


        # 3. Skill Gap Filler / Suggestion
        skills_prompt = f"""
        You are an expert career coach. Based on the provided job description and the skills currently present in the resume,
        identify any crucial technical or soft skills that are prominent in the job description but seem
        missing or under-represented in the resume. Suggest 3-5 such skills that the applicant should consider adding
        or highlighting.

        Current Resume Skills:
        {', '.join(current_skills)}

        Job Description:
        {jd_text}

        List the suggested skills, separated by commas.
        """
        response_skills = model.generate_content(skills_prompt)
        suggested_skills_raw = response_skills.text.strip()
        suggested_skills = [s.strip() for s in suggested_skills_raw.split(',') if s.strip()]


        # 4. JD vs Resume Matcher Analysis
        match_analysis_prompt = f"""
        Analyze the alignment between the provided resume and job description.
        Identify 2-3 key areas where the resume strongly matches the JD, and 2-3 areas where there might be a "keyword gap" or where the resume could be strengthened to better align.
        
        Resume Content (Summary, Experience, Skills):
        Summary: {current_summary}
        Experience: {current_experience_bullets}
        Skills: {', '.join(current_skills)}

        Job Description:
        {jd_text}

        Provide your analysis in two distinct sections: "Strong Matches:" and "Areas for Improvement:".
        Finally don't mention the key changes and why they were made. That is Irrelevant.
        """
        response_match_analysis = model.generate_content(match_analysis_prompt)
        match_analysis_text = clean_gemini_output(response_match_analysis.text)


    except Exception as e:
        current_app.logger.error(f"Gemini API or processing error: {str(e)}")
        return jsonify({"error": f"AI processing failed: {str(e)}"}), 500

    return jsonify({
        "message": "Resume improvement generated successfully!",
        "extracted_resume_data": extracted_resume_data,
        "improved_summary": improved_summary,
        "improved_bullets": improved_bullets,
        "suggested_skills": suggested_skills,
        "match_analysis": match_analysis_text
    }), 200