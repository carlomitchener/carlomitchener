import mrlypy.two as m2
from mrlypy.core.colors import black, blue, green, red
from mrlypy.core.enums import Mode

def main():

    def new_cell():
        return m2.tree_2d(7)
        
    fills = [black]
    voids = [red, green, blue]
    mode = Mode.ENUMERATE
    params = ({0: voids, 1: fills}, mode)

    # PAINT
    
    new_cell().paint(*params).to_image(10).show()

    new_cell().paint(*params).rotate(90).to_image(10).show()

    new_cell().rotate(90).paint(*params).to_image(10).show()

if __name__ == "__main__":
    main()
