"""
From : https://gist.github.com/osmanzeki/13ad20cca2bbffa7a600a3648888da83
Description :
Allows batch exporting of FBX files contained in a
given folder to BabylonJS files in the same folder.
Dependencies :
- Blender 2.7.8a
- BabylonJS Blender Exporter 4.6.1 (from https://github.com/BabylonJS/Babylon.js)
Usage :
1 - Open Blender (ideally with Console visible).
2 - Open the Text Editor and load this file.
3 - Edit the CONVERT_DIR var in this file to your folder of need.
4 - Run the script.
You can find more information, references and inspiration these discussions :
- http://www.html5gamedevs.com/topic/27961-blender-batch-export-using-babylon-exporter-addon/
- http://blender.stackexchange.com/a/47000
- http://blender.stackexchange.com/a/34539
Obligatory Warning :
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

__author__ = "Osman Zeki"
__email__ = "osman@zeki.ca"
__license__ = "GPL"
__version__ = "0.0.1"

#-------------------------------------------------------
# Imports
#-------------------------------------------------------

import os
import bpy
import io_export_babylon

#-------------------------------------------------------
# Module
#-------------------------------------------------------

# Make sure to set your source folder here (the one containing all the FBX
# files)
CONVERT_DIR = "/Path_To_Your_Folder_Containing_The_Fbx_Files"


def file_iter(path, ext):
    """ Iterate throught files with given extension in given directory. """

    for root, dirs, files in os.walk(path):
        for filename in files:
            if filename.endswith(ext):
                yield os.path.join(root, filename)


def reset_blend():
    """ Reset scene to factory settings. """

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def convert_recursive(base_path):
    """ Convert between formats recursively. """

    print("-------------------------------------------------------")
    print("> Batch Export FBX to Babylon")
    print("-------------------------------------------------------")
    print("\n")

    for filepath_src in file_iter(base_path, ".fbx"):
        filepath_dst = os.path.splitext(filepath_src)[0] + ".babylon"

        # Cleanup before import
        print("\n")
        print("> Cleaning up before import...")
        reset_blend()

        # Import from FBX
        print("\n")
        print("> Importing")
        print("%r" % filepath_src)
        bpy.ops.import_scene.fbx(filepath=filepath_src)

        # Export to Babylon (will overwrite previous files if any)
        print("\n")
        print("> Exporting")
        print("%r" % filepath_dst)
        bpy.ops.scene.babylon(check_existing=False, filepath=filepath_dst)

        # Cleanup after export
        print("\n")
        print("> Cleaning up after export...")
        reset_blend()
        
    print("\n\n")
    print("> ALL DONE!")
    return{'FINISHED'}

if __name__ == "__main__":
    convert_recursive(CONVERT_DIR)
