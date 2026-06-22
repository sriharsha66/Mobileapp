export interface QuoteItem {
  id: string;
  text: string;
  icon: string;
  color: string;
}

export const QUOTE_FAV_KEY = '@medvault_quote_favorites';

export const ALL_QUOTES: QuoteItem[] = [
  { id: 'q01', text: 'Your health is an investment, not an expense.', icon: '💚', color: '#00897B' },
  { id: 'q02', text: 'Prevention is always better than cure.', icon: '🛡️', color: '#1565C0' },
  { id: 'q03', text: 'Take care of your body — it is the only place you have to live.', icon: '🏃', color: '#FB8C00' },
  { id: 'q04', text: 'A healthy outside starts from the inside.', icon: '✨', color: '#5E35B1' },
  { id: 'q05', text: 'The greatest wealth is health.', icon: '💰', color: '#43A047' },
  { id: 'q06', text: 'Early detection saves lives. Keep up with regular check-ups.', icon: '🔍', color: '#E53935' },
  { id: 'q07', text: 'Good health is not something we can buy. But it is an extremely valuable savings account.', icon: '⭐', color: '#1565C0' },
  { id: 'q08', text: 'Keeping medical records organised is one of the best gifts for your future self.', icon: '📋', color: '#00897B' },
  { id: 'q09', text: 'Your body keeps an accurate journal, regardless of what you write down.', icon: '📝', color: '#5E35B1' },
  { id: 'q10', text: 'Each report you store today is a piece of your health story for tomorrow.', icon: '🗂️', color: '#FB8C00' },
  { id: 'q11', text: 'Regular blood tests are a window into your body\'s health story.', icon: '🩸', color: '#E53935' },
  { id: 'q12', text: 'Every heartbeat is precious. Monitor your cardiac health regularly.', icon: '❤️', color: '#D81B60' },
  { id: 'q13', text: 'X-ray imaging gives clarity that guides better treatment decisions.', icon: '🩻', color: '#5E35B1' },
  { id: 'q14', text: 'MRI scans help doctors deliver more precise, personalised care.', icon: '🧠', color: '#3949AB' },
  { id: 'q15', text: 'Organised prescriptions ensure you never miss the right dose at the right time.', icon: '💊', color: '#43A047' },
  { id: 'q16', text: 'CT scans reveal what the naked eye cannot see. Always review results with your doctor.', icon: '🔬', color: '#00897B' },
  { id: 'q17', text: 'Regular ultrasounds are a proactive step in monitoring your internal health.', icon: '🫀', color: '#039BE5' },
  { id: 'q18', text: 'Discharge summaries are vital reference documents — you are smart to keep them safe.', icon: '📄', color: '#FB8C00' },
  { id: 'q19', text: 'Vaccinations protect not just you but everyone around you. Stay up to date!', icon: '💉', color: '#8E24AA' },
  { id: 'q20', text: 'A person who has good health is young, and a person who owes nothing is rich.', icon: '😊', color: '#00897B' },
  { id: 'q21', text: 'Rest when you are tired, not when you are exhausted. Listen to your body.', icon: '🌙', color: '#3949AB' },
  { id: 'q22', text: 'Your mental health is just as important as your physical health.', icon: '🧘', color: '#8E24AA' },
];
