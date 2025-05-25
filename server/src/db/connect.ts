/** @format */

import mongoose from "mongoose";

const connect = (url: string) => {
  return mongoose.connect(url);
};
export default connect;
