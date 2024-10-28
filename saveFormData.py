import os

import sys


localdir = open('../localdir.txt', 'r').read()
os.chdir(localdir)


print("SAVE FORM DATA")

from db_handler import db

user_id = sys.argv[1]

print("Saving planning do to DB for " + user_id)

db.set_planning_doc_data(user_id)