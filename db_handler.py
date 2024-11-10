from openai import OpenAI
import os
from tinydb import TinyDB, Query
import json
import uuid
import threading
import filelock
import time
from contextlib import contextmanager

class ThreadSafeDatabaseHandler:
    def __init__(self, db_path='storage/database.json'):
        self.db_path = db_path
        self.lock_path = f"{db_path}.lock"
        self.file_lock = filelock.FileLock(self.lock_path)
        self.memory_lock = threading.Lock()
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # Load blank templates
        with open('storage/chatTranscript_blank.json', 'r') as file:
            self.blank_chat_history = json.load(file)['messages']
        with open('storage/formData_blank.json', 'r') as file:
            self.blank_form_data = json.load(file)
        with open('storage/data_state_blank.txt', 'r') as file:
            self.blank_data_state = json.load(file)

        # Initialize OpenAI client
        self.my_key = open('key_to_gpt.txt','r').readline()
        self.client = OpenAI(api_key=self.my_key)

    @contextmanager
    def get_db_connection(self, timeout=10):
        """Thread-safe database connection context manager"""
        start_time = time.time()
        while True:
            try:
                with self.file_lock.acquire(timeout=timeout):
                    db = TinyDB(self.db_path)
                    try:
                        yield db
                    finally:
                        db.close()
                break
            except filelock.Timeout:
                if time.time() - start_time > timeout:
                    raise TimeoutError("Could not acquire database lock")
                time.sleep(0.1)

    def new_session_id(self):
        """Generate a unique session ID"""
        with self.memory_lock:
            with self.get_db_connection() as db:
                sessions = db.table('sessions')
                all_session_ids = [session['session_id'] for session in sessions.all()]
                while True:
                    candidate_id = str(uuid.uuid4())
                    if candidate_id not in all_session_ids:
                        return candidate_id

    def create_new_session(self, user_id, session_id="CREATESESSIONID"):
        """Create a new session with thread-safe operations"""
        if session_id == "CREATESESSIONID":
            session_id = self.new_session_id()

        new_session = {
            'session_id': session_id,
            'user_id': user_id,
            'thread_id': self.client.beta.threads.create().id,
            'instructions_prompt_file': 'step_zero_explain_process',
            'user_input': '',
            'chat_history': self.blank_chat_history.copy(),
            'data_state': self.blank_data_state.copy(),
            'form_data': self.blank_form_data.copy(),
            'special_notes': "",
            'last_prompt': ""
        }

        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            sessions.insert(new_session)

        # Thread-safe file operation
        chat_transcript_path = f'ux/userdata/chatTranscript_{user_id}.json'
        with filelock.FileLock(f"{chat_transcript_path}.lock"):
            with open(chat_transcript_path, 'w') as file:
                json.dump(self.blank_chat_history, file)

        return session_id

    def get_session(self, session_id):
        """Thread-safe session retrieval"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            return sessions.get(Session.session_id == session_id)

    def update_session(self, session_id, update_func):
        """
        Thread-safe session update using a callback function
        
        Args:
            session_id: The ID of the session to update
            update_func: Callback function that takes the session dict and returns modified session
        """
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            if session:
                updated_session = update_func(session)
                sessions.update(updated_session, Session.session_id == session_id)
                return True
        return False

    def update_chat_history(self, session_id, message):
        """Thread-safe chat history update"""
        def update_func(session):
            session['chat_history'].append(message)
            return session
        return self.update_session(session_id, update_func)

    def get_chat_history(self, session_id):
        """Thread-safe chat history retrieval"""
        session = self.get_session(session_id)
        return session['chat_history'] if session else []

    def set_planning_doc_data(self, user_id, planning_doc_data=None):
        """Thread-safe planning document update"""
        session_id = self.get_session_id_for_user(user_id)
        
        if planning_doc_data is None:
            form_data_path = f'ux/userdata/formData_{user_id}.json'
            if not os.path.exists(form_data_path):
                with filelock.FileLock(f"{form_data_path}.lock"):
                    with open(form_data_path, 'w') as f:
                        json.dump(self.blank_form_data, f)
        
        def update_func(session):
            session['form_data'] = planning_doc_data
            return session
        return self.update_session(session_id, update_func)

    def get_session_id_for_user(self, user_id):
        """Get or create session ID for user with thread safety"""
        with self.get_db_connection() as db:
            users = db.table('users')
            User = Query()
            user = users.get(User.user_id == user_id)
            
            if user:
                # If user exists, return their session_id (create new if None)
                if not user.get('session_id'):
                    session_id = self.create_new_session(user_id)
                    users.update({'session_id': session_id}, User.user_id == user_id)
                    
                    
                session = self.get_session(user['session_id'])
                with open('ux/userdata/chatTranscript_'+user_id+'.json', 'w') as file:
                    json.dump(session['chat_history'], file)
                
                return user['session_id']
                
            else:
                # If user doesn't exist, create new user and session
                session_id = self.create_new_session(user_id)
                users.insert({'user_id': user_id, 'session_id': session_id})
                return session_id

    def load_planning_doc_data(self, user_id):
        """Load planning document data for user"""
        session_id = self.get_session_id_for_user(user_id)
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            return session.get('form_data', self.blank_form_data) if session else self.blank_form_data

    def get_special_notes(self, session_id):
        """Get special notes for session"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            return session.get('special_notes', "") if session else ""

    def get_data_state(self, session_id):
        """Get data state for session"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            return session.get('data_state', self.blank_data_state) if session else self.blank_data_state

    def get_instructions_prompt_file(self, session_id):
        """Get instructions prompt file for session"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            return session.get('instructions_prompt_file', 'step_zero_explain_process') if session else 'step_zero_explain_process'

    def get_thread_id(self, session_id):
        """Get thread ID for session"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            return session.get('thread_id', '') if session else ''

    def update_instructions_prompt_file(self, session_id, next_step):
        """Update instructions prompt file for session"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            if session:
                session['instructions_prompt_file'] = next_step
                sessions.update(session, Session.session_id == session_id)

    def update_data_state(self, session_id, new_data_state):
        """Update data state for session"""
        with self.get_db_connection() as db:
            sessions = db.table('sessions')
            Session = Query()
            session = sessions.get(Session.session_id == session_id)
            if session:
                session['data_state'] = new_data_state
                sessions.update(session, Session.session_id == session_id)

    def create_new_session_for_user(self, user_id):        
        session_id = self.create_new_session(user_id)
        self.set_current_session_for_user(user_id, session_id)
        return session_id

    
    def set_current_session_for_user(self, user_id, session_id):
        with self.get_db_connection() as db:
            User = Query()
            users = db.table('users')
            sessions = db.table('sessions')
            user = users.get(User.user_id == user_id)

            Sessions = Query()
            all_sessions = sessions.search(Sessions.user_id == user_id)
            session_ids = [session['session_id'] for session in all_sessions]
            session_exists = session_id in session_ids


            # if user exists, load or create session
            if user:
                print('setting id to ' + session_id)
                users.update({'session_id': session_id}, User.user_id == user_id)
                # if session doesn't exist ...?
                if(not session_exists):
                    self.create_new_session_for_user_by_session_id(user_id, session_id)
                    
            else:
                # If user doesn't exist, create new user and session
                db.users.insert({'user_id': user_id, 'session_id': session_id})


        return True
    
    def copy_user(self, from_user_id, new_user_id):
        """
        Copy all data from an existing user to a new user.
        
        Args:
            new_user_id (str): User ID to copy data to
            from_user_id (str): User ID to copy data from
        """
        with self.get_db_connection() as db:
            users = db.table('users')
            sessions = db.table('sessions')

            # Get source user's current session
            User = Query()
            from_user = users.get(User.user_id == from_user_id)
            if not from_user:
                raise ValueError(f"Source user {from_user_id} not found")
                
            # Get source session data
            Session = Query()
            from_session = sessions.get(Session.session_id == from_user['session_id'])
            if not from_session:
                raise ValueError(f"Source session not found")

            # Create new session with copied data
            new_session = from_session.copy()
            new_session['session_id'] = str(uuid.uuid4())  # New unique session ID
            new_session['user_id'] = new_user_id
            new_session['thread_id'] = self.client.beta.threads.create().id  # New OpenAI thread
            
            # Insert new session
            sessions.insert(new_session)
            
            # Create or update new user with new session
            new_user = {
                'user_id': new_user_id,
                'session_id': new_session['session_id']
            }
            users.upsert(new_user, User.user_id == new_user_id)
            print(from_session['form_data'])
            print('ok')
            self.set_planning_doc_data(new_user_id, from_session['form_data'])
            return new_session['session_id']

    def cleanup(self):
        """Cleanup method to release locks if needed"""
        try:
            self.file_lock.release()
        except:
            pass

    def __del__(self):
        """Destructor to ensure cleanup"""
        self.cleanup()


        
    

# Error handling decorator for retrying failed operations
def retry_on_error(max_retries=3, delay=0.1):
    def decorator(func):
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts < max_retries:
                try:
                    return func(*args, **kwargs)
                except (filelock.Timeout, TimeoutError) as e:
                    attempts += 1
                    if attempts == max_retries:
                        raise
                    time.sleep(delay * (2 ** attempts))  # Exponential backoff
            return None
        return wrapper
    return decorator

# Usage example:
db = ThreadSafeDatabaseHandler()

# Example of using the retry decorator
@retry_on_error(max_retries=3)
def safe_update_chat(session_id, message):
    return db.update_chat_history(session_id, message)