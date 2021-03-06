
import * as errorhub from '../errorhub'
import redboxWrapper from './redboxWrapper'
import { destroyPlugin, destroy } from './destroy'


/**
 * @param {object}
 */
export default function createCreateInstance(PluginApi) {

	/**
	 * @param {object}
	 * @param {object}
	 * @return {object}
	 */
	return function createInstance(pluginObj, createPlugin) {
		pluginObj.plugin = createPlugin;
		pluginObj.failing = false;
		pluginObj.reload = function() {
			pluginObj.reloadData && pluginObj.reloadData();
			pluginObj.hotReload();
		}
		pluginObj.internalCall = function(name, canBeFailing, fn) {
			if (canBeFailing || pluginObj.failing===false) {
				redboxWrapper(name, pluginObj, fn);
			}
		}
		pluginObj.hotReload = function(newPlugin) {
			redboxWrapper('destroyPlugin', pluginObj, () => destroyPlugin(pluginObj, newPlugin!==null));

			pluginObj.failing = false;
			pluginObj.plugin = newPlugin===null ? null : (newPlugin || pluginObj.plugin);
			pluginObj.pluginApi = undefined;
			pluginObj.api = function(name) {};
			pluginObj.instances = [];

			pluginObj.plugin && redboxWrapper('createPlugin', pluginObj, function() {
				const pluginApi = new PluginApi({
					$element: pluginObj.$element,
					pluginName: pluginObj.pluginName,
					pluginId: pluginObj.pluginId,
					pluginObj: pluginObj,
					state: pluginObj.state,
					name: pluginObj.name,
				}, pluginObj.hotReload);

				pluginObj.pluginApi = pluginApi;
				pluginObj.api = pluginApi.eachApi.bind(pluginApi);
				pluginObj.pluginApi.createInstance = function(createPlugin, plugin) {
					plugin = plugin || pluginObj.pluginArgumentsObj;
					plugin = {...plugin}

					if (plugin.state) {
						plugin.state = plugin.state(createPlugin, pluginObj.instances.length);
					}

					const _pluginApi = pluginApi.spawn({
						$element: plugin.$element || pluginObj.$element,
						pluginName: pluginObj.pluginName,
						pluginId: pluginObj.pluginId,
						pluginObj: pluginObj,
						state: plugin.state,
						name: pluginObj.name,
					});

					return redboxWrapper('createInstance', _pluginApi, function() {
						const instance = createPlugin.call(_pluginApi, plugin)||{};
						pluginObj.instances.push(instance);

						return function() {
							if (pluginObj.instances.indexOf(instance)!==-1) {
								pluginObj.instances.splice(pluginObj.instances.indexOf(instance), 1);
							}

							redboxWrapper('destroyInstance', _pluginApi, function() {
								_pluginApi.destroy(false);
								destroy(instance, false);
							})
						}
					}) || function(){};
				}

				if (pluginObj.plugin.argumentObj) {
					pluginObj.instances.push(pluginObj.plugin.call(pluginApi, pluginObj.pluginArgumentsObj||{})||{});

				} else {
					pluginObj.instances.push(pluginObj.plugin.apply(pluginApi, pluginObj.pluginArguments||[])||{});
				}
			});
		}

		pluginObj.hotReload();
		return pluginObj;
	}
}
