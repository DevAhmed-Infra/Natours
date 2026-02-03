class APIFeatures {
  constructor(query, queryString, aliasOptions = {}) {
    this.query = query;
    this.queryString = queryString;
    this.aliasOptions = aliasOptions;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    const mongoQuery = {};

    Object.keys(queryObj).forEach((key) => {
      const operatorMatch = key.match(/(.+)\[(gte|gt|lte|lt)\]/);

      if (operatorMatch) {
        const field = operatorMatch[1];
        const operator = operatorMatch[2];

        if (!mongoQuery[field]) {
          mongoQuery[field] = {};
        }

        mongoQuery[field][`$${operator}`] = Number(queryObj[key]);
      } else {
        const value = isNaN(queryObj[key])
          ? queryObj[key]
          : Number(queryObj[key]);

        mongoQuery[key] = value;
      }
    });

    this.query = this.query.find(mongoQuery);
    return this;
  }

  sort() {
    const sortValue = this.aliasOptions.sort || this.queryString.sort;

    if (sortValue) {
      const sortBy = sortValue.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  limitFields() {
    const fieldsValue = this.aliasOptions.fields || this.queryString.fields;

    if (fieldsValue) {
      const fields = fieldsValue.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit =
      this.aliasOptions.limit ||
      (this.queryString.limit ? this.queryString.limit * 1 : 100);

    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
