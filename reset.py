import os
import sys
# os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
os.chdir("/root/planning-doc-chatbot")

from db_handler import db

import json


user_id = sys.argv[1]

print("Resetting user: " + user_id)


with open('storage/formData_blank.json', 'r') as file:
    form_data = json.load(file)


new_session_id = db.create_new_session_for_user(user_id)

chat_history = db.get_chat_history(new_session_id)
with open('ux/chatTranscript_'+user_id+'.json', 'w') as file:
    json.dump(chat_history, file)