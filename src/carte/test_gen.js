const gen = require('./holographique');
const mockMember = {
  displayName: 'TestUser',
  user: {
    username: 'testuser',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
};
const mockData = {
  level: 1, xp: 10, required: 100, messages: 5, voiceMinutes: 0, streak: 0, karma: 0, roleName: 'AUCUN'
};

gen(mockMember, mockData, 'holographique').then(a => {
  console.log('CARD GEN SUCCESS! Buffer length:', a.attachment.length);
}).catch(e => {
  console.error('CARD GEN FAILURE:', e);
});
