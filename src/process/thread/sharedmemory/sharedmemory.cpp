#include <string>

#include <napi.h>
#include <node_buffer.h>
#include <semaphore.h>
#include <sys/shm.h>

#include <iostream>
#include <unistd.h>

typedef uint32_t t_key;

sem_t* sem;

pid_t random_value = getpid();


void throw_error(Napi::Env env, std::string message) {
    sem_post(sem);
	
    Napi::Error::New(env, message).ThrowAsJavaScriptException();
}

t_key numerate_unique_key(std::string unique_key) {
    const int p = 128;
    const int m = 1e9 + 9;

    t_key hash_key = 0;
    t_key p_pow = 1;

    for (char c : unique_key) {
        hash_key = (hash_key + (c + 1) * p_pow) % m;
        p_pow = (p_pow * p) % m;
    }

    return hash_key;
}


void write_shm(const Napi::CallbackInfo& args) {
	Napi::Env env = args.Env();

	t_key unique_key = numerate_unique_key(args[0].ToString().Utf8Value());

	const Napi::Uint8Array buffer_array = args[1].As<Napi::Uint8Array>();
	const size_t length = buffer_array.ElementLength();
    const uint8_t* buffer = buffer_array.Data();

    sem = sem_open((char*)(unique_key), O_CREAT, 0644, 0);
	
	int shm_id = shmget(unique_key, (length + 1) * sizeof(uint8_t), IPC_CREAT | 0644);
    if(shm_id == -1) {
        throw_error(env, "Could not access shared memory");
        return;
    }

	uint8_t* segment = (uint8_t*)shmat(shm_id, NULL, 0);
    if(segment == (uint8_t*)-1) {
        throw_error(env, "Could not access shared memory segment");
        return;
    }
    
    size_t i;
    for(i = 0; i < length; i++) {
        segment[i] = buffer[i];
    }
    segment[i] = '\0';
    
    shmdt(segment);

    sem_post(sem);
}

Napi::Buffer<uint8_t> read_shm(const Napi::CallbackInfo& args) {
	Napi::Env env = args.Env();
	
	t_key unique_key = numerate_unique_key(args[0].ToString().Utf8Value());

	sem = sem_open((char*)(unique_key), O_CREAT, 0644, 0);

	int shm_id = shmget(unique_key, 0, 0 | 0644);
    if(shm_id == -1) {
        throw_error(env, "Could not access shared memory");
        return Napi::Buffer<uint8_t>::New(env, NULL, 0);
    }

    uint8_t* segment = (uint8_t*)shmat(shm_id, NULL, 0);
    if(segment == (uint8_t*)-1) {
		throw_error(env, "Could not access shared memory segment");
        return Napi::Buffer<uint8_t>::New(env, NULL, 0);
    }
    
    sem_post(sem);
    
    size_t length = -1;
    while(++length < *(size_t*)segment) {
        if(segment[length] == '\0') break;
    }

    return Napi::Buffer<uint8_t>::New(env, segment, length);
}

void free_shm(const Napi::CallbackInfo& args) {
    Napi::Env env = args.Env();

	t_key unique_key = numerate_unique_key(args[0].ToString().Utf8Value());

    sem = sem_open((char*)(unique_key), O_CREAT, 0644, 0);
	
	int shm_id = shmget(unique_key, 0, IPC_CREAT | 0644);    // TODO: Collision strategy (occpuancy)
    if(shm_id == -1) {
        throw_error(env, "Could not access shared memory");
        return;
    }

	shmctl(shm_id, IPC_RMID, NULL);

    sem_post(sem);
}


Napi::Object bind(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "write"), Napi::Function::New(env, write_shm));
	exports.Set(Napi::String::New(env, "read"), Napi::Function::New(env, read_shm));
	exports.Set(Napi::String::New(env, "free"), Napi::Function::New(env, free_shm));

	return exports;
}


NODE_API_MODULE(sharedmemory, bind)