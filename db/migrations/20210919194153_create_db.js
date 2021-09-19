
exports.up = function(knex) {
  /*
    create table if not exists metrics (
      id integer primary key,
      room_name text not null,
      session_id text not null,
      timestamp integer not null,
      send_bps real not null,
      recv_bps real not null,
      send_packet_loss real not null,
      recv_packet_loss real not null
    );
  */
  return knex.schema.createTable('metrics', function (table) {
    table.increments();
    table.string('room_name');
    table.string('session_id');
    table.integer('timestamp');
    table.float('send_bps');
    table.float('recv_bps');
    table.float('send_packet_loss');
    table.float('recv_packet_loss');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('metrics');
};
