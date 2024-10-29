import os
import json
import sys
import base64

localdir = open('../localdir.txt', 'r').read()
os.chdir(localdir)

from db_handler import db

if len(sys.argv) < 2:
    print("Error: User ID is required")
    sys.exit(1)

user_id = sys.argv[1]
planning_doc_data = None

if len(sys.argv) > 2:
    # If we have the base64 data, use it
    try:
        base64_data = sys.argv[2]
        json_str = base64.b64decode(base64_data).decode('utf-8')
        planning_doc_data = json.loads(json_str)
    except Exception as e:
        print(f"Error decoding JSON data: {e}")
        # Fall back to file reading

if planning_doc_data is None:
    # Fall back to reading from file
    try:
        with open(f'ux/userdata/formData_{user_id}.json', 'r') as file:
            planning_doc_data = json.load(file)
    except Exception as e:
        print(f"Error reading from file: {e}")
        sys.exit(1)

print(f"Saving planning data to DB for {user_id}")
db.set_planning_doc_data(user_id, planning_doc_data)