# Bostadsförmedlingen

Store all apartments and get notified by email when a new one pops up.

# Setup
 1. ```npm install```
 2. Create a file with the name ```credentials.json``` and fill it as follows. This is the account that will send the mail.
 ```
 {
    "user":"yourusername@gmail.com",
    "pass":"yourpassword"
 }
 ```
 3. Create a file with the name ```recipients.json``` and fill it as follows. These are the accounts that will recieve the mails.
 ```
 [
    {
        "email":"firstemail@yahoo.com"
    },
    {
        "email":"anotheremail@cooldomain.com"
    }
 ]
 ```
 4. ```npm start```
