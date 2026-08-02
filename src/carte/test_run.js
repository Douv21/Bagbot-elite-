const genCard = require('./holographique');

const mockMember = {
  displayName: 'BagbotUser',
  user: {
    username: 'bagbotuser',
    discriminator: '0',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
};

const mockData = {
  level: 1,
  xp: 15,
  required: 120,
  messages: 10,
  voiceMinutes: 5,
  streak: 0,
  karma: 0,
  roleName: 'AUCUN'
};

genCard(mockMember, mockData, 'holographique')
  .then(attachment => {
    console.log('✅ TEST 7fb62b9 SUCCESS! Attachment size:', attachment.attachment.length);
  })
  .catch(err => {
    console.error('❌ TEST 7fb62b9 ERROR:', err);
  });
