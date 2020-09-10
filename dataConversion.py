import json
import random

with open('HES_V1_V5_HIERARCHY.json') as f:
  data = json.load(f)

category = ['High', 'Medium', 'Low'];

def traversal(dictionary):
    newData = {
	    'NET_PATIENT_REVENUE' : round(random.uniform(1.00, 20.00), 2),
    	'NET_INCOME' : round(random.uniform(1.00, 20.00), 2),
    	'NET_INCOME_MARGIN' : round(random.uniform(1.00, 20.00), 2),
    	'STRUCTURE_SEGMENT' : category[(random.randrange(100) % 3)],
    	'PATIENT_EXPERIENCE_SEGEMENT' : category[(random.randrange(100) % 3)],
    	'QUALITY_SEGMENT' : category[(random.randrange(100) % 3)],
    	'RESEARCH_SEGEMENT' : category[(random.randrange(100) % 3)],
    	'WILLINGNESS_TO_PATNER_SEGMENT' : category[(random.randrange(100) % 3)],
    	'EXPRESSION_SEGMENT' : category[(random.randrange(100) % 3)]	
	}
    
    dictionary.update(newData)
        
    if 'children' in dictionary:
        for child in dictionary['children']:
            traversal(child)

#json_formatted_str = json.dumps(data[0]['children'], indent=4)

#print(json_formatted_str)

#import sys
#sys.exit(0)

for entity in data:
	traversal(entity)

json_formatted_str = json.dumps(data, indent=4)

print(json_formatted_str)