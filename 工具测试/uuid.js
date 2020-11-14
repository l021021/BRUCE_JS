const UUID = require('uuid-js')
console.log(UUID.create(4)); // Generate V4 UUID

UUID.create(1); // Generate V1 TimeUUID

UUID.fromTime(time, last); // Generate a V1 empty TimeUUID from a Date object (Ex: new Date().getTime() )

UUID.firstFromTime(time); // Same as fromTime but first sequence

UUID.lastFromTime(time); // Same as fromTime but last sequence

UUID.fromURN(strId); // Generate a UUID object from string

UUID.fromBytes(ints); // Generate a UUID object from bytes

UUID.fromBinary(binary); // Generate a UUID object from binary