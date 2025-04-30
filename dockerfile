# Use the official Node.js 18 image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that Render expects (Render uses PORT environment variable, default 10000)
EXPOSE 10000

# Command to run the application
CMD ["node", "index.js"]