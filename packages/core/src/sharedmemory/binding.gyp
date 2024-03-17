{
    "targets": [
        {
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            "target_name": "sharedmemory",
            'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
            "sources": [ "sharedmemory.cpp" ]
        }
    ]
}