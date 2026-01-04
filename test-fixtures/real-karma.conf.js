// Real karma config structure as provided by user
module.exports = function(config) {
	config.set({
		preprocessors: {
			'webapp/components/metrics/webapp/**/*!(Component).js': [
				'coverage'
			],
			'{,!(webapp/components/metrics/test-resources)}/*.js': [
				'coverage'
			]
		},
		
		coverageReporter: {
			dir: "target/coverage/frontend-unit-metric/",
			includeAllSources: true,
			reporters: [
				{
					type: "html",
					subdir: "report-html/ut"
				}, {
					type: "text"
				}, {
					type: "lcov",
					subdir: "report-lcov/ut"
				}, {
					type: "cobertura",
					subdir: ".",
					file: "cobertura-coverage.xml"
				}
			],
			instrumenterOptions: {
				istanbul: {
					noCompact: true
				}
			}
        },

		reporters: [
			'junit', 'progress', 'coverage'
		],

		browsers: [
			'ChromeNoSandbox'
		],

		singleRun: true
	});
};

