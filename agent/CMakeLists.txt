cmake_minimum_required (VERSION 3.18)

project (agent-bin C CXX)

set(CMAKE_BINARY_DIR ${PROJECT_SOURCE_DIR}/build)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(DEBUG_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/debug)
set(CMAKE_MODULE_PATH $CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/Modules/")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O2")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2") 

add_definitions(-DGLOG_NO_ABBREVIATED_SEVERITIES)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
find_package(libmongocxx REQUIRED)
find_package(libbsoncxx REQUIRED)
find_package(Threads)
find_package(cpptoml REQUIRED)
set(Boost_USE_STATIC_LIBS ON)
option(ASIOPATH "asio header path")
add_definitions(-DASIO_STANDALONE)
# add_definitions(-DBOOST_ASIO_HAS_CO_AWAIT)
if (ASIOPATH) 
include_directories(${ASIOPATH})
else()
find_package(Boost COMPONENTS system)
include_directories(${Boost_INCLUDE_DIR})
endif(ASIOPATH)

file(GLOB_RECURSE  DIR_SRCS *.cc)
file(GLOB_RECURSE REMOVE_CMAKE "build/*")
list(REMOVE_ITEM ${DIR_SRCS} ${REMOVE_CMAKE})

add_executable(agent ${DIR_SRCS})

target_include_directories(agent
  PRIVATE ${LIBMONGOCXX_INCLUDE_DIRS} ${LIBBSONCXX_INCLUDE_DIRS}
)

target_compile_definitions(agent
  PRIVATE ${LIBMONGOCXX_DEFINITIONS} ${LIBBSONCXX_DEFINITIONS}
)

target_link_libraries(agent Threads::Threads ${LIBMONGOCXX_LIBRARIES} ${LIBBSONCXX_LIBRARIES})
