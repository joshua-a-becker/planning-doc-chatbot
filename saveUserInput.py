import os
import sys
os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")

from db_handler import db

user_id = sys.argv[1]
user_input = sys.argv[2]

session_id = db.get_session_id_for_user(user_id)

db.update_user_input(session_id, user_input)