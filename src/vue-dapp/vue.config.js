module.exports = {
  productionSourceMap: false,
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'Udacity - Blockchain Developer - FlightSurety',
    },
  },
  devServer: {
    disableHostCheck: true,
    port: 8000,
    public: '0.0.0.0:8000',
  },
  publicPath: process.env.NODE_ENV === 'production' ? '/web3modal-vue/' : '/',
  transpileDependencies: ['vuetify', 'web3modal-vue'],
}
