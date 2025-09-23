const supabase = require('../config/database.cjs');

async function updateSafetyScore(dtid, delta, reason) {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('tourist_profiles')
      .select('safety_score')
      .eq('dtid', dtid)
      .single();
    if (fetchError) throw fetchError;

    const currentScore = profile?.safety_score ?? 100;
    const newScore = Math.max(0, Math.min(100, currentScore + delta));

    const { error: updateError } = await supabase
      .from('tourist_profiles')
      .update({ safety_score: newScore })
      .eq('dtid', dtid);
    if (updateError) throw updateError;

    await supabase
      .from('safety_score_events')
      .insert({ dtid, delta, reason, resulting_score: newScore });

    return { success: true, safety_score: newScore };
  } catch (error) {
    console.error('updateSafetyScore error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { updateSafetyScore };


