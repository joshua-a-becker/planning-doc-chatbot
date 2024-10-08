import os
from tinydb import TinyDB, Query
import json
import uuid

with open('storage/chatTranscript_blank.json', 'r') as file:
    blank_chat_history = json.load(file)['messages']

with open('storage/formData_blank.json', 'r') as file:
    blank_form_data = json.load(file)

with open('storage/data_state_blank.txt', 'r') as file:
    blank_data_state = json.load(file)


class DatabaseHandler:
    def __init__(self, db_path='storage/database.json'):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db = TinyDB(db_path)
        self.sessions = self.db.table('sessions')
        self.users = self.db.table('users') 

    def create_new_session(self, user_id):
        session_id = str(uuid.uuid4())
        print(session_id)
        new_session = {
            'session_id': session_id,
            'user_id': user_id,
            'thread_id': "",
            'instructions_prompt_file': 'step_zero_explain_process',
            'user_input' : '',
            'chat_history': blank_chat_history,
            'data_state': blank_data_state,
            'form_data': blank_form_data,
            'special_notes': "",
            'last_prompt': ""
        }
        
        self.sessions.insert(new_session)
        return session_id
    
    def create_new_session_for_user(self, user_id):
        session_id = self.create_new_session(user_id)
        self.set_current_session_for_user(user_id, session_id)
        return session_id

    def get_session_id_for_user(self, user_id):
        User = Query()
        user = self.users.get(User.user_id == user_id)
        if user:
            # If user exists, return their session_id (create new if None)
            if not user['session_id']:
                user['session_id'] = self.create_new_session(user_id)
                self.users.update({'session_id': user['session_id']}, User.user_id == user_id)
            return user['session_id']
        else:
            # If user doesn't exist, create new user and session
            new_session_id = self.create_new_session(user_id)
            self.users.insert({'user_id': user_id, 'session_id': new_session_id})
            return new_session_id
        
        
    def set_current_session_for_user(self, user_id, session_id):
        User = Query()
        user = self.users.get(User.user_id == user_id)
        if user:
            self.users.update({'session_id': session_id}, User.user_id == user_id)
        else:
            # If user doesn't exist, create new user and session
            self.users.insert({'user_id': user_id, 'session_id': session_id})

    def get_session(self, session_id):
        Session = Query()
        return self.sessions.get(Session.session_id == session_id)


    def get_chat_history(self, session_id):
        session = self.get_session(session_id)
        return session['chat_history'] if session else []

    def update_chat_history(self, session_id, message):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['chat_history'].append(message)
            self.sessions.update(session, Session.session_id == session_id)

    def get_last_prompt(self, session_id):
        session = self.get_session(session_id)
        return session['last_prompt'] if session else ""

    def update_last_prompt(self, session_id, prompt):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['last_prompt'] = prompt
            self.sessions.update(session, Session.session_id == session_id)

    def get_data_state(self, session_id):
        session = self.get_session(session_id)
        return session['data_state'] if session else {}

    def update_data_state(self, session_id, new_state):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['data_state'] = new_state
            self.sessions.update(session, Session.session_id == session_id)

    def get_special_notes(self, session_id):
        session = self.get_session(session_id)
        return session['special_notes'] if session else ""

    def update_special_notes(self, session_id, content):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['special_notes'] = content
            self.sessions.update(session, Session.session_id == session_id)

    def get_thread_id(self, session_id):
        session = self.get_session(session_id)
        return session['thread_id'] if session else ""

    def set_thread_id(self, session_id, thread_id):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['thread_id'] = thread_id
            self.sessions.update(session, Session.session_id == session_id)
        return thread_id

    def get_instructions_prompt_file(self, session_id):
        session = self.get_session(session_id)
        return session['instructions_prompt_file'] if session else ""

    def update_instructions_prompt_file(self, session_id, content):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['instructions_prompt_file'] = content
            self.sessions.update(session, Session.session_id == session_id)

    def load_planning_doc_data(self, session_id):
        # Assuming planning_doc_data is stored in a separate JSON file
        with open('ux/formData_'+session_id+'.json', 'r') as file:
            return json.load(file)
        
    def list_all_users(self):
        return [user['user_id'] for user in self.users.all()]


    def list_sessions_for_user(self, user_id):
        User = Query()
        user = self.users.get(User.user_id == user_id)
        
        if user:
            # Get all sessions where this user's email is mentioned
            Session = Query()
            all_sessions = self.sessions.search(Session.user_id == user_id)
            session_ids = [session['session_id'] for session in all_sessions]
            
            return session_ids
        else:
            return []
        
    def get_all_users(self):
        return self.users.all()
    
    def get_user_input(self, session_id):
        session = self.get_session(session_id)
        return session['user_input'] if session else ""

    def update_user_input(self, session_id, content):
        Session = Query()
        session = self.get_session(session_id)
        if session:
            session['user_input'] = content
            self.sessions.update(session, Session.session_id == session_id)
    


# Initialize the database handler
db = DatabaseHandler()