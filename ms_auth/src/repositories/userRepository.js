// src/repositories/userRepository.js
// Repositorio que implementa la abstracción sobre userModel.
import * as Model from '../models/userModel.js';

export class UserRepository {
  async create(payload) { return Model.createUser(payload); }
  async emailExists(email) { return Model.emailExists(email); }
  async usernameExists(username) { return Model.usernameExists(username); }
  async findByEmail(email) { return Model.getUserByEmail(email); }
}

export default new UserRepository();
