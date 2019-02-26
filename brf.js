const ax          = require('axios');
const fs          = require('fs');
const nodemailer  = require('nodemailer');
const colors      = require('colors');

const credentials = require('./credentials');
const recipients  = require('./recipients');

let apartments;
let queuedMails = [];

function logger(log) {
  console.log(`${getCurrentTime()} ${log}`)
}

function addZeroBefore(n) {
  return (n < 10 ? '0' : '') + n;
}

function getCurrentTime(){
  let now = new Date();
  let h = addZeroBefore(now.getHours());
  let m = addZeroBefore(now.getMinutes());
  let s = addZeroBefore(now.getSeconds());

  return `[${h}:${m}:${s}]`;
}

fs.readFile('./data.json', 'utf8', (err, data) => {
  if (err) {
    apartments = []
    ping(false);
    return logger(err);
  }

  apartments = JSON.parse(data);
});

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: credentials.user,
    pass: credentials.pass
  }
});

function mailOptions(text) {
  return {
    from: credentials.user,
    to: recipients.map((recipient) => recipient.email += ','),
    subject: 'Ny hyresrätt',
    html: text
  }
};

function ping(sendMail = true) {
  ax.get("https://bostad.stockholm.se/Lista/AllaAnnonser")
    .then((resp) => {
      let data = resp.data;
      let dDidChange = false;
      for(d of data) {
        if(!apartments.find(x => x.AnnonsId === d.AnnonsId)){
          dDidChange = true;
          apartments.push(d);
          logger(`Added new apartment with ID: ${d.AnnonsId} to array`);
          if(sendMail){
            queuedMails.push(mailOptions(`<a href="https://bostad.stockholm.se${d.Url}">Ny Lägenhet i ${d.Stadsdel}</a> \n <p>Våning: ${d.Vaning} Rum: ${d.AntalRum} m2: ${d.Yta} Hyra: ${d.Hyra} Bostadssnabben: ${d.BostadsSnabben ? 'Ja' : 'Nej'} Ungdom: ${d.Ungdom ? 'Ja' : 'Nej'}</p>`));
          }
        }
      }

      logger(`${dDidChange ? 'New results were found'.green : 'No new results'.red}`)
      save();
    })
    .catch((err) => {
      logger(err);
    });
}

function save() {
  fs.writeFile('./data.json', JSON.stringify(apartments), (err) => {
    if(err){
      return logger(err);
    }
  })
}

function trySendQueuedMail(){
  if(queuedMails.length > 0) {
    transporter.sendMail(queuedMails[0], (error, info) => {
      if (error) {
        logger(error);
      } else {
        logger('Email sent: ' + info.response);
      }
    });
    queuedMails.shift();
  }
}

setInterval(ping, 60000);
setInterval(trySendQueuedMail, 10000);
