import os
from tinydb import TinyDB, Query
import json

class DatabaseHandler:
    def __init__(self, db_path='storage/database.json'):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db = TinyDB(db_path)
        self.chat_history = self.db.table('chat_history')
        self.data_state = self.db.table('data_state')
        self.special_notes = self.db.table('special_notes')
        self.thread_id = self.db.table('thread_id')
        self.instructions_prompt_file = self.db.table('instructions_prompt_file')
        self.last_prompt = self.db.table('last_prompt')

        self._set_defaults()

    def _set_defaults(self):
        if not self.instructions_prompt_file.all():
            self.instructions_prompt_file.insert({'content': 'step_zero_explain_process'})

        if not self.chat_history.all():
            with open('storage/chatTranscript_blank.json', 'r') as file:
                blank_chat_history = json.load(file)['messages']
            self.chat_history.insert({'content': blank_chat_history})

    def reset_database(self):
        self.db.drop_tables()
        self.chat_history = self.db.table('chat_history')
        self.data_state = self.db.table('data_state')
        self.special_notes = self.db.table('special_notes')
        self.thread_id = self.db.table('thread_id')
        self.instructions_prompt = self.db.table('instructions_prompt')
        self.last_prompt = self.db.table('last_prompt')
        self._set_defaults()
        print("Database has been reset to default values.")

    def get_chat_history(self):
        history = self.chat_history.all()
        return history[0]['content'] if history else []

    def update_chat_history(self, message):
        history = self.chat_history.all()[0]['content']
        history.append(message)
        self.chat_history.update({'content': history})

    def get_last_prompt(self):
        return self.last_prompt.all()
    
    def update_last_prompt(self, prompt):
        self.last_prompt.truncate()
        self.last_prompt.insert({'content': prompt})

    def get_data_state(self):
        state = self.data_state.all()
        return state[0]['content'] if state else {}

    def update_data_state(self, new_state):
        self.data_state.truncate()
        self.data_state.insert({'content':new_state})

    def get_special_notes(self):
        notes = self.special_notes.all()
        return notes[0]['content'] if notes else ""

    def update_special_notes(self, content):
        self.special_notes.truncate()
        self.special_notes.insert({'content': content})

    def get_thread_id(self):
        thread = self.thread_id.all()
        return thread[0]['id'] if thread else ""

    def set_thread_id(self, thread_id):
        self.thread_id.truncate()
        self.thread_id.insert({'id': thread_id})
        return thread_id

    def get_instructions_prompt_file(self):
        prompt = self.instructions_prompt_file.all()
        return prompt[0]['content'] if prompt else ""

    def update_instructions_prompt_file(self, content):
        self.instructions_prompt_file.truncate()
        self.instructions_prompt_file.insert({'content': content})

    def load_planning_doc_data(self):
        # Assuming planning_doc_data is stored in a separate JSON file
        with open('ux/formData.json', 'r') as file:
            return json.load(file)

# Initialize the database handler
db = DatabaseHandler()
