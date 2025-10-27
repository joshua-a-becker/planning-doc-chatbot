import os
import sys

# os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

localdir = open('../localdir.txt', 'r').read()
os.chdir(localdir)

from db_handler import db

import json


user_id = sys.argv[1]
user_name = db.get_user_name(user_id)

print("Resetting user: " + user_id)

# Don't delete the planning doc - keep it across resets
# try:
#    os.remove("ux/userdata/formData_" + user_id + ".json")
# except FileNotFoundError:
#    pass

new_session_id = db.create_new_session_for_user(user_id, user_name)

chat_history = db.get_chat_history(new_session_id)
# Wrap in messages object for frontend
with open('ux/userdata/chatTranscript_'+user_id+'.json', 'w') as file:
    json.dump({"messages": chat_history}, file)


