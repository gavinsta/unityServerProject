# General Notes

- For managing serializing enums: https://stackoverflow.com/questions/2441290/javascriptserializer-json-serialization-of-enum-as-string

# Keywords
Several objects will repeatedly use methods like `SetUp()` or `Initialize()`

For consistency, these terms have particular meanings:
- `SetUp()`: is always a method that should be called by the same instance of the object. It sets itself up. This sequence can be before or after `Initialize()`
- `Initialize()`: is always a method that should be called by ANOTHER object (usually some manager-like object). `Initialize()` can be used in place of constructors for some `Monobehaviors`