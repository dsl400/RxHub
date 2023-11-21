# RxHub
Utility that provides all necesary tools to stream data in javascript applications


```[<driver>://](<table>|<path/to/document>)[/<documentId>][.<action>[:<arguments>]]```

<driver>: Selects an API-specific driver. If no driver is specified the default driver will be used

<table> | <path/to/document>: Secifies the target of the operation. It could  either table name or a path leading to a collection or folder. 

<documentId>: Used only when reading or writing to a specific document or file

<action>: This component selects an action stream. If no action is specified it will be inferred by examining the request.

<arguments>: uri encoded string used to provide additional arguments for the specified action.
