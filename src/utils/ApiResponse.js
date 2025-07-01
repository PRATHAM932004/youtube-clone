class ApiResponse {
  constructor(status, data, message = "Success!") {
    this.status = status < 400;
    this.message = message;
    this.data = data;
    this.success = true;
  }
}

export { ApiResponse };
