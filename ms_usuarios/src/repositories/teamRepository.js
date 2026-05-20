import * as Model from '../models/teamModel.js';

class TeamRepository {
  create(payload){ return Model.createTeam(payload); }
  findByUser(user_id){ return Model.getTeamsByUser(user_id); }
  findById(id){ return Model.getTeamById(id); }
  update(id, payload){ return Model.updateTeam(id, payload); }
  delete(id){ return Model.deleteTeam(id); }
  replacePokemons(team_id,pokemons){ return Model.replaceTeamPokemons(team_id,pokemons); }
}

export default new TeamRepository();
