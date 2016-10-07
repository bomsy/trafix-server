#!/bin/bash
n=20
while [ $n -gt 0 ]
do
  curl \
  -H "Content-Type:application/json" \
  -d '{ "id": '${RANDOM}', "comment": "this is a test" }' \
  http://localhost:8000/api/status
  ((n--));
done
exit
