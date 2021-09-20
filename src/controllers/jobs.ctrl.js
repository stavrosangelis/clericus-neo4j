const driver = require('../config/db-driver');

class Job {
  constructor({
    _id = null,
    label = '',
    output = null,
    relId = null,
    completed = false,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    if (typeof _id !== 'undefined' && _id !== null) {
      this._id = _id;
    }
    if (label !== '') {
      this.label = label.trim();
    }
    if (output !== null) {
      this.output = output;
    }
    this.relId = relId;
    this.completed = completed;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }
};

module.exports = {
  Job: Job,
}
