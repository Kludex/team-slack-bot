let Botkit = require('botkit');
require('dotenv').config();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
  console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
  process.exit(1);
} else {
  console.log('Good job, you have the variables!')
}

let controller = Botkit.slackbot({
  json_file_store: './db/',
  debug: true,
  clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
});

controller.configureSlackApp({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
  scopes: ['commands', 'bot'],
});

let bot = controller.spawn({
  token: process.env.BOT_TOKEN,
  incoming_webhook: {
    url: 'WE_WILL_GET_TO_THIS'
  }
}).startRTM();

controller.setupWebserver(process.env.PORT, function(err, webserver){
  controller.createWebhookEndpoints(controller.webserver);
  controller.createOauthEndpoints(controller.webserver,
    function(err, req, res) {
      if (err) {
        res.status(500).send('ERROR: ' + err);
      } else {
        res.send('Success!');
      }
    }
  );
});

const command2function = {
  '/team-add': addTeamMember,
  '/team-sort': shuffleTeamMembers,
}

function addTeamMember(bot, message) {
  controller.storage.channels.get(message.channel,
    function(err, data) {
      let usernames = data && data.usernames.length ? data.usernames : Array()
      usernames.push(message.text)
      controller.storage.channels.save({
        id: message.channel,
        usernames: usernames,
      }, function(err) {});
      bot.reply(message, `*${message.text}* was added to your channel's team.`)
    }
  );
}

function shuffleTeamMembers(bot, message) {
  controller.storage.channels.get(message.channel,
    function(err, data) {
      try {
        usernames = data.usernames.sort(() => Math.random() - 0.5)
        console.log(usernames)
        bot.reply(message, `*Sorted team*: ${usernames.map(
          (value, index) => `\n${index + 1}. ${value}`).join('')}`
        )
      } catch (e) {
        bot.reply(message, "This channel doesn't have a team yet!")
      }
    }
  );
}

controller.on('slash_command', function(bot, message) {
  bot.replyAcknowledge()
  try {
    command2function[message.command](bot, message)
  } catch (e) {
    bot.reply(message, 'Did not recognize that command, sorry!')
  }
});
