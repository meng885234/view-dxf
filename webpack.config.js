// 配置文件使用commonjs规范

module.exports = {
	mode: 'development',

	// 入口，是一个对象
	entry: {
		index: './src/index.js'
	},

	// 输出
	output: {
		// 带五位hash值的js
		// filename: 'index.js',
		// chunkhash和hash不一样，它根据不同的入口文件(Entry)进行依赖文件解析、构建对应的chunk，生成对应的哈希值。我们在生产环境里把一些公共库和程序入口文件区分开，单独打包构建，接着我们采用chunkhash的方式生成哈希值，那么只要我们不改动公共库的代码，就可以保证其哈希值不会受影响。
		// filename: '[name].[hash:5].js',
		// filename: '[name].[chunkhash:8].js',
		filename: '[name].js',
		library: {
			root: 'Viewer',
			amd: 'Viewer',
			commonjs: 'Viewer'
		},
		libraryTarget: 'umd',
		libraryExport: 'default', // 增加这个属性以避免在打包后用script标签引入的方式在使用的时候在后面再加上.default,eg:new Viewer.default()
	}

}