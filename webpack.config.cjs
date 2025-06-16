const path = require('path');

module.exports = {
  entry: './app/scripts/app.mjs',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|mjs)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.mjs']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'app'),
    },
    compress: true,
    port: 9000,
    hot: true
  }
}; 