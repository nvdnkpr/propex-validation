
var Px = require("propex");

function Validator(config){
	
	function fn(propex, value, augmentors){
		if(!propex)
			return { valid: value };
		if(typeof propex == "string")
			propex = Px(propex);

		return propex.recurse(value, {
			found: function(property, key, item, context){
				var actions = context.actions && context.actions[key];
				var valid = context.valid;
				var errors = context.errors;

				if(!actions) {
					valid[key] = item;
					return;
				}
				if(actions.parse) {
					item = actions.parse(property.subproperties, item);
					if(item.errors)
						errors[key] = item.errors;

					item = item.valid;
				}

				var errorMessage;
				if(actions.test && (errorMessage = actions.test(item))){
					errors[key] = errorMessage;
				}
				else{
					if(actions.set) actions.set.call(property, valid, item);
					else valid[key] = item;
				}
			},
			objectStart: function(property, name, item, context){
				var isArray = Array.isArray(item);
				var isRoot = name==null;
				var newContext = {
					parent: context,
					valid: isArray? [] : {},
					errors: isArray? [] : {},
					actions: isRoot? config :
						//arrays use the same actions over and over and
						//cause objectStart to fire once for the array,
						//and then once for every object in it.
						(typeof name == "number"?
							(context.actions||{}) :       //array
							(context.actions||{})[name])  //object
				};
				if(!isRoot)
					context.valid[name] = newContext.valid;

				return newContext;
			},
			objectEnd: function(property, name, item, context){
				if(Object.keys(context.errors).length){
					if(context.parent)
						context.parent.errors[name] = context.errors;
				}
				else delete context.errors;//this takes care of the root object

				return context;
			},
			missing: function(property, key, context){
				var msg = Validator.errors.required(key);;
				if(key==null) //root object was missing or a missmatch
					return { errors: msg };
				context.errors[key] = msg;
			},
			marker: function(property, key, item, context){
				var marker = property.subproperties.marker;
				if(marker && augmentors){
					var aug = augmentors[marker];
					aug && aug(property, key, item, context);
				}
			}
		});
	}
	fn.constructor = Validator;
	fn.__proto__ = Validator.prototype;
	fn.validators = config = (function(temp){
		Object.keys(config || {}).forEach(function(k) {
			var v = config[k];
			if(v.constructor == Validator){
				temp[k] = v.validators;
			}
			else temp[k] = clone(v);
		});
		return temp;
	})({});

	return fn;
}
Validator.errors = {
	required: function(){ return "This information is required" }
}

function typeMismatch(isArray, data){
	var dataIsArray = Array.isArray(data);
	return (isArray && !dataIsArray) || (!isArray && dataIsArray)
}
function clone(obj){
	var obj2 = {};
	Object.keys(obj).forEach(function(k) {
		obj2[k] = obj[k];
	});
	return obj2;
}


module.exports = Validator;