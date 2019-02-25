const ax          = require('axios');
const fs          = require('fs');
const nodemailer  = require('nodemailer')
const credentials = require('./credentials')
const recipients  = require('./recipients')

let apartments;

fs.readFile('./data.json', 'utf8', (err, data) => {
  if (err) {
    apartments = []
    ping(false);
    return console.log(err);
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
      for(d of data) {
        if(!apartments.find(x => x.AnnonsId === d.AnnonsId)){
          apartments.push(d);
          console.log(`Added new apartment with ID: ${d.AnnonsId} to array`);
          if(sendMail){
            transporter.sendMail(mailOptions(`<a href="https://bostad.stockholm.se${d.Url}">Ny Lägenhet i ${d.Stadsdel}</a> \n <p>Våning: ${d.Vaning} Rum: ${d.AntalRum} m2: ${d.Yta} Hyra: ${d.Hyra}</p>`), (error, info) => {
              if (error) {
                console.log(error);
              } else {
                console.log('Email sent: ' + info.response);
              }
            });
          }
        }
      }

      save();
    })
    .catch((err) => {
      console.log(err);
    })
}

function save() {
  fs.writeFile('./data.json', JSON.stringify(apartments), (err) => {
    if(err){
      return console.log(err);
    }
    console.log(`Successfully saved data`);
  })
}

setInterval(ping, 60000);
