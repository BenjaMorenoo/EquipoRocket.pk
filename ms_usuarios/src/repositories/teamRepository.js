import * as Model from '../models/teamModel.js';

class TeamRepository {
  create(payload){ return Model.createTeam(payload); }
  findByUser(user_id){ return Model.getTeamsByUser(user_id); }
  findPublic(exclude_user_id){ return Model.getPublicTeams(exclude_user_id); }
  findById(id){ return Model.getTeamById(id); }
  update(id, payload){ return Model.updateTeam(id, payload); }
  delete(id){ return Model.deleteTeam(id); }
  replacePokemons(team_id,pokemons){ return Model.replaceTeamPokemons(team_id,pokemons); }
  addFeedback(team_id, user_id, type){ return Model.addTeamFeedback(team_id, user_id, type); }
  getFeedbackCounts(team_id){ return Model.getFeedbackCounts(team_id); }
  updatePokemonSpread(team_pokemon_id, user_id, spread_id){ return Model.updateTeamPokemonSpread(team_pokemon_id, user_id, spread_id); }
}

export default new TeamRepository();
