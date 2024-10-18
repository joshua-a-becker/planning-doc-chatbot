import os
import sys

# os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

localdir = open('../localdir.txt', 'r').read()
os.chdir(localdir)


from db_handler import db

user_id = sys.argv[1]
session_id = sys.argv[2]


def main():
    # create new session
    if(sys.argv[2]) == "NEWSESSION":
        print(db.create_new_session_for_user(user_id))
        return

    # get current default session
    if(sys.argv[2]) == "UNSPECIFIED":
        print(db.get_session_id_for_user(user_id))
        return

    # set requested session to current
    # note -- this will create a new one if it doesn't exist
    success = db.set_current_session_for_user(user_id, session_id)

    print("Success: ", success)

    if(success):
        print(session_id)
    
    else: 
        print("SESSION_ID_DOES_NOT_EXIST")

if __name__ == "__main__":
    main()
