#include <string>

#include <napi.h>
#include <node_buffer.h>


Napi::String read(const Napi::CallbackInfo& args) {
	Napi::Env env = args.Env();

	std::string purpose_key = args[0].ToString().Utf8Value();
	
	//void* buffer = Storage::read(&app_key, purpose_key);
	//uint8_t* buffer_uint8 = (uint8_t*)buffer;

	/* if(buffer_uint8 == (uint8_t*)-1) {
		Napi::RangeError::New(env, "Could not access shared memory segment (r)").ThrowAsJavaScriptException();
		
		return Napi::Buffer<uint8_t>::New(env, NULL, 0);
	} else if(buffer_uint8 == (uint8_t*)-2) {
		return Napi::Buffer<uint8_t>::New(env, NULL, 0);
	} */
	
	//size_t length = *(size_t*)buffer;
	//buffer_uint8 += sizeof(size_t);

	return Napi::String::New(env, "aw", 2);
}


Napi::Object bind(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "write"), Napi::Function::New(env, read));
	exports.Set(Napi::String::New(env, "read"), Napi::Function::New(env, read));

	return exports;
}


NODE_API_MODULE(sharedmemory, bind)