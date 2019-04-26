const ax          = require('axios');
const fs          = require('fs');
const nodemailer  = require('nodemailer');
const colors      = require('colors');

const credentials = require('./credentials');
const recipients  = require('./recipients');

let apartments;
let queuedMails = [];

function logger(log) {
  console.log(`${getCurrentTime()} ${log}`);
}

function addZeroBefore(n) {
  return (n < 10 ? '0' : '') + n;
}

function getCurrentTime(){
  let now = new Date();
  let h = addZeroBefore(now.getHours());
  let m = addZeroBefore(now.getMinutes());
  let s = addZeroBefore(now.getSeconds());
  let D = addZeroBefore(now.getDate());
  let M = addZeroBefore(now.getMonth() + 1);

  return `[${h}:${m}:${s} - ${D}/${M}]`;
}

fs.readFile('./data.json', 'utf8', (err, data) => {
  if (err) {
    apartments = []
    ping(false);
    return logger(`data.json not found, creating it..`);
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

function mailOptions(subject, text) {
  return {
    from: credentials.user,
    to: recipients.map((recipient) => recipient.email += ','),
    subject: subject,
    html: text
  }
};

function pingHyres(sendMail = true) {
  ax.get("https://bostad.stockholm.se/Lista/AllaAnnonser")
    .then((resp) => {
      let data = resp.data;
      let dDidChange = false;
      for(d of data) {
        if(!apartments.find(x => x.AnnonsId === d.AnnonsId)){
          dDidChange = true;
          apartments.push(d);
          logger(`Found new rental. ID: ${d.AnnonsId}`);
          if(sendMail){
            queuedMails.push(`<a href="https://bostad.stockholm.se${d.Url}">Ny hyresrätt i ${d.Stadsdel}</a> \n <p>Våning: ${d.Vaning} Rum: ${d.AntalRum} m2: ${d.Yta} Hyra: ${d.Hyra} Bostadssnabben: ${d.BostadsSnabben ? 'Ja' : 'Nej'} Ungdom: ${d.Ungdom ? 'Ja' : 'Nej'} Student: ${d.Student ? 'Ja' : 'Nej'}</p>`);
          }
        }
      }

      !dDidChange && logger('No new results'.red);
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
  if(queuedMails.length === 1) {
    let mail = queuedMails.shift();
    transporter.sendMail(mailOptions(`Ny hyresrätt`, mail), (error, info) => {
      if (error) {
        logger(error);
        queuedMails.push(mail);
      } else {
        logger('Email sent: ' + info.response);
      }
    });
  }else if(queuedMails.length > 1){
    let mails = queuedMails.join('\n');
    transporter.sendMail(mailOptions(`Nya hyresrätter`, mails), (error, info) => {
      if (error) {
        logger(error);
      } else {
        logger('Email sent: ' + info.response);
        queuedMails = [];
      }
    });
  }
}

logger(`=======> Starting script <=======`);

setInterval(pingHyres, 60000);
setInterval(trySendQueuedMail, 10000);
