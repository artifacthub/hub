import csv
import os
import shutil
import tempfile
import tensorflow as tf
import time
from tensorflow import keras
from keras import layers

# Set TF log level to INFO
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

# Categories
CATEGORIES = [
    "0-unknown",
    "1-ai-machine-learning",
    "2-database",
    "3-integration-delivery",
    "4-monitoring-logging",
    "5-networking",
    "6-security",
    "7-storage",
    "8-streaming-messaging"
]

# Datasets configuration
TRAIN_CSV_PATH = "data/csv/train.csv"
TEST_CSV_PATH = "data/csv/test.csv"
TRAIN_DS_PATH = "data/generated/train"
TEST_DS_PATH = "data/generated/test"
MODEL_PATH = "model"
VOCABULARY_SIZE = 2500

# Model configuration
LAYER_SIZE = 32
LEARNING_RATE = 0.001
EPOCHS = 20


def build_model(use_validation_data=True, save=False):
    """Build and train model"""

    # Load datasets
    (train_ds, validation_ds, test_ds) = load_datasets(validation_split=use_validation_data)

    # Create, train and save model
    model = keras.Sequential([
        keras.Input(shape=(1,), dtype="string"),
        setup_vectorizer(train_ds),
        keras.Input(shape=(VOCABULARY_SIZE,)),
        layers.Dense(LAYER_SIZE, activation="relu"),
        layers.Dense(len(CATEGORIES), activation="softmax")
    ])
    model.compile(
        optimizer=keras.optimizers.RMSprop(learning_rate=LEARNING_RATE),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    model.fit(
        train_ds,
        validation_data=validation_ds,
        epochs=EPOCHS
    )
    if save:
        model.save(MODEL_PATH)

    # Evaluate model accuracy with test data
    print(f"Test accuracy: {model.evaluate(test_ds)[1]:.3f}")


def load_datasets(validation_split):
    """Load train, validation and test datasets"""

    # Load train and validation datasets
    if validation_split:
        (train_ds, validation_ds) = keras.utils.text_dataset_from_directory(
            TRAIN_DS_PATH,
            label_mode="categorical",
            validation_split=0.2,
            subset="both",
            seed=int(time.time())
        )
    else:
        train_ds = keras.utils.text_dataset_from_directory(
            TRAIN_DS_PATH,
            label_mode="categorical"
        )
        validation_ds = None

    # Load test dataset
    test_ds = keras.utils.text_dataset_from_directory(
        TEST_DS_PATH,
        label_mode="categorical"
    )

    return (train_ds, validation_ds, test_ds)


def setup_vectorizer(train_ds):
    """Setup vectorize layer using the train dataset provided"""

    # Create vectorization layer
    vectorize_layer = layers.TextVectorization(
        max_tokens=VOCABULARY_SIZE,
        output_mode="multi_hot",
        split=cumtom_split_fn,
        standardize=custom_standardization_fn,
    )

    # Prepare vocabulary
    vectorize_layer.adapt(train_ds.map(lambda x, _: x))

    return vectorize_layer


@tf.keras.utils.register_keras_serializable()
def cumtom_split_fn(string_tensor):
    """Split string by comma"""
    return tf.strings.split(string_tensor, sep=",")


@tf.keras.utils.register_keras_serializable()
def custom_standardization_fn(string_tensor):
    """Covert string to lowercase and strip whitespaces"""
    lowercase_string = tf.strings.lower(string_tensor)
    return tf.strings.strip(lowercase_string)


def build_data_trees():
    """Build the train and test data trees from the CSV files"""

    def build_data_tree_from_csv(csv_path, dst_path):
        # Clean destination path
        shutil.rmtree(dst_path, ignore_errors=True)

        # Process CSV file, creating a new file for each set of keywords in the
        # corresponding category directory
        with open(csv_path) as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=';')
            for row in csv_reader:
                category, keywords = row[0], row[1]

                # Create output directory if needed
                category_path = os.path.join(dst_path, category)
                if not os.path.isdir(category_path):
                    os.makedirs(category_path)

                # Write keywords to file
                with tempfile.NamedTemporaryFile(
                    mode="w",
                    prefix="",
                    suffix=".txt",
                    dir=category_path,
                    delete=False
                ) as f:
                    f.write(keywords)

    build_data_tree_from_csv(TRAIN_CSV_PATH, TRAIN_DS_PATH)
    build_data_tree_from_csv(TEST_CSV_PATH, TEST_DS_PATH)


def predict(raw_text):
    """Generate a prediction for a raw text"""

    # Load model
    model = keras.models.load_model(MODEL_PATH)

    # Calculate prediction
    predictions = model.predict(tf.convert_to_tensor([[raw_text]]), verbose=0)

    # Print prediction details and category selected
    print(predictions[0])
    print(CATEGORIES[predictions[0].argmax()])


if __name__ == "__main__":
    build_data_trees()
    build_model(use_validation_data=False, save=False)
